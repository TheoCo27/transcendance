// Ce fichier contient la logique metier du profil utilisateur et du systeme d'amis.
import { PrismaService } from "@/prisma/prisma.service";
import {
  FriendshipStatus,
  Prisma,
  User,
  UserStatus,
} from "@generated/prisma/client";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UpdateProfilePayload } from "./dto/update-profile-payload.dto";

export type FriendUserSummary = Pick<
  User,
  "id" | "username" | "isGuest" | "avatar_url" | "status" | "createdAt"
>;

export type FriendRequestSummary = {
  id: number;
  status: FriendshipStatus;
  createdAt: Date;
  user: FriendUserSummary;
};

export type FriendOverview = {
  friends: FriendUserSummary[];
  receivedRequests: FriendRequestSummary[];
  sentRequests: FriendRequestSummary[];
};

export type FriendActionResult = {
  message: string;
  friendshipStatus: FriendshipStatus;
};

const SUPPORTED_AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Recherche un utilisateur par email exact.
  async findUserByEmail(email: string): Promise<User | null> {
    return this.findUser({ email });
  }

  // Recherche un utilisateur par pseudo exact.
  async findUserByUsername(username: string): Promise<User | null> {
    const users = await this.findUsersByUsername(username, 1);

    return users[0] ?? null;
  }

  // Retourne tous les utilisateurs correspondant a un pseudo.
  async findUsersByUsername(username: string, take?: number): Promise<User[]> {
    return this.findUsers({
      where: { username },
      take,
      orderBy: { id: "asc" },
    });
  }

  // Recherche un utilisateur unique via Prisma.
  async findUser(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    return this.prisma.client.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  // Recherche une liste d'utilisateurs avec filtres Prisma.
  async findUsers(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;

    return this.prisma.client.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  // Cree un utilisateur en base.
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.client.user.create({
      data,
    });
  }

  // Met a jour un utilisateur en base.
  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;

    return this.prisma.client.user.update({
      data,
      where,
    });
  }

  // Met a jour le statut si besoin sans ecrire inutilement la meme valeur.
  async setUserStatusIfChanged(
    userId: number,
    status: UserStatus,
  ): Promise<void> {
    await this.prisma.client.user.updateMany({
      where: {
        id: userId,
        status: {
          not: status,
        },
      },
      data: {
        status,
      },
    });
  }

  // Supprime un utilisateur en base.
  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return this.prisma.client.user.delete({
      where,
    });
  }

  // Retourne la vue globale du systeme d'amis d'un utilisateur.
  async getFriendOverview(userId: number): Promise<FriendOverview> {
    const currentUser = await this.findUser({ id: userId });

    if (!currentUser) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    this.ensureFriendSystemAvailable(currentUser);

    const [acceptedRelations, receivedRequests, sentRequests] =
      await Promise.all([
        this.prisma.client.friendRequests.findMany({
          where: {
            status: "accepted",
            OR: [{ senderId: userId }, { receiverId: userId }],
          },
          include: {
            sender: true,
            receiver: true,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
        this.prisma.client.friendRequests.findMany({
          where: {
            receiverId: userId,
            status: "pending",
          },
          include: {
            sender: true,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
        this.prisma.client.friendRequests.findMany({
          where: {
            senderId: userId,
            status: "pending",
          },
          include: {
            receiver: true,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
      ]);

    const uniqueFriends = new Map<number, FriendUserSummary>();

    for (const relation of acceptedRelations) {
      const friend =
        relation.senderId === userId ? relation.receiver : relation.sender;

      if (!friend.isGuest) {
        uniqueFriends.set(friend.id, this.buildFriendUserSummary(friend));
      }
    }

    return {
      friends: Array.from(uniqueFriends.values()).sort((left, right) =>
        left.username.localeCompare(right.username, "fr"),
      ),
      receivedRequests: receivedRequests
        .filter((relation) => !relation.sender.isGuest)
        .map((relation) => ({
          id: relation.id,
          status: relation.status,
          createdAt: relation.createdAt,
          user: this.buildFriendUserSummary(relation.sender),
        })),
      sentRequests: sentRequests
        .filter((relation) => !relation.receiver.isGuest)
        .map((relation) => ({
          id: relation.id,
          status: relation.status,
          createdAt: relation.createdAt,
          user: this.buildFriendUserSummary(relation.receiver),
        })),
    };
  }

  // Retourne uniquement la liste des amis.
  async listFriends(userId: number): Promise<FriendUserSummary[]> {
    const overview = await this.getFriendOverview(userId);
    return overview.friends;
  }

  // Verifie si deux utilisateurs sont deja amis.
  async areUsersFriends(userId: number, friendId: number): Promise<boolean> {
    if (userId === friendId) {
      return false;
    }

    const relation = await this.prisma.client.friendRequests.findFirst({
      where: {
        status: "accepted",
        OR: [
          {
            senderId: userId,
            receiverId: friendId,
          },
          {
            senderId: friendId,
            receiverId: userId,
          },
        ],
      },
      select: {
        id: true,
      },
    });

    return Boolean(relation);
  }

  // Envoie une demande d'ami ou accepte une demande inverse.
  async sendFriendRequest(
    senderId: number,
    rawUsername: string,
  ): Promise<FriendActionResult> {
    const sender = await this.findUser({ id: senderId });

    if (!sender) {
      throw new NotFoundException(`User ${senderId} not found`);
    }

    this.ensureFriendSystemAvailable(sender);

    const username = rawUsername.trim();
    const matchingUsers = await this.findUsersByUsername(username, 2);

    if (matchingUsers.length === 0) {
      throw new NotFoundException(
        "Aucun utilisateur trouvé",
      );
    }

    if (matchingUsers.length > 1) {
      throw new ConflictException(
        "This username is ambiguous. Ask the user to rename their account.",
      );
    }

    const receiver = matchingUsers[0];

    if (receiver.id === senderId) {
      throw new BadRequestException("Vous ne pouvez pas vous ajouter vous-même en ami");
    }

    this.ensureFriendSystemAvailable(receiver);

    const activeRelation = await this.getActiveFriendRelation(
      senderId,
      receiver.id,
    );

    if (activeRelation?.status === "accepted") {
      throw new ConflictException("You are already friends");
    }

    if (activeRelation?.status === "pending") {
      if (activeRelation.senderId === senderId) {
        throw new ConflictException("A friend request is already pending");
      }

      await this.prisma.client.friendRequests.update({
        where: { id: activeRelation.id },
        data: {
          status: "accepted",
        },
      });

      return {
        message: `${receiver.username} is now in your friends list`,
        friendshipStatus: "accepted",
      };
    }

    const createdRequest = await this.prisma.client.friendRequests.create({
      data: {
        senderId,
        receiverId: receiver.id,
        status: "pending",
      },
    });

    return {
      message: `Friend request sent to ${receiver.username}`,
      friendshipStatus: "pending",
    };
  }

  // Permet d'accepter ou refuser une demande d'ami recue.
  async respondToFriendRequest(
    userId: number,
    requestId: number,
    action: "accepted" | "declined",
  ): Promise<FriendActionResult> {
    const currentUser = await this.findUser({ id: userId });

    if (!currentUser) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    this.ensureFriendSystemAvailable(currentUser);

    const request = await this.prisma.client.friendRequests.findUnique({
      where: { id: requestId },
      include: {
        sender: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`Friend request ${requestId} not found`);
    }

    if (request.receiverId !== userId) {
      throw new ForbiddenException("You cannot manage this friend request");
    }

    if (request.status !== "pending") {
      throw new ConflictException("This friend request is no longer pending");
    }

    if (request.sender.isGuest) {
      throw new ConflictException("Guest accounts cannot be added as friends");
    }

    await this.prisma.client.friendRequests.update({
      where: { id: requestId },
      data: {
        status: action,
      },
    });

    return {
      message:
        action === "accepted"
          ? `${request.sender.username} has been added to your friends list`
          : `Friend request from ${request.sender.username} declined`,
      friendshipStatus: action,
    };
  }

  // Met a jour ou supprime l'avatar d'un utilisateur.
  async updateAvatar(
    userId: number,
    avatarDataUrl: string | null,
  ): Promise<User> {
    const user = await this.findUser({ id: userId });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (avatarDataUrl === null) {
      return this.updateUser({
        where: { id: userId },
        data: {
          avatar_url: null,
        },
      });
    }

    const normalizedAvatar = avatarDataUrl.trim();
    this.assertAvatarDataUrlIsValid(normalizedAvatar);

    return this.updateUser({
      where: { id: userId },
      data: {
        avatar_url: normalizedAvatar,
      },
    });
  }

  // Met a jour le profil editable d'un utilisateur.
  async updateProfile(userId: number, payload: UpdateProfilePayload): Promise<User> {
    const user = await this.findUser({ id: userId });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const username = this.normalizeUsername(payload.username);
    const existingUser = await this.findUserByUsername(username);

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException("Username already exists");
    }

    return this.updateUser({
      where: { id: userId },
      data: {
        username,
        status: payload.status,
      },
    });
  }

  // Recherche la relation d'amitie active entre deux utilisateurs.
  private async getActiveFriendRelation(senderId: number, receiverId: number) {
    return this.prisma.client.friendRequests.findFirst({
      where: {
        status: {
          in: ["pending", "accepted"],
        },
        OR: [
          {
            senderId,
            receiverId,
          },
          {
            senderId: receiverId,
            receiverId: senderId,
          },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  }

  // Bloque les actions d'amitie pour les comptes invites.
  private ensureFriendSystemAvailable(user: User): void {
    if (user.isGuest) {
      throw new ForbiddenException(
        "The friend system is not available for guest accounts",
      );
    }
  }

  // Nettoie et valide un pseudo utilisateur.
  private normalizeUsername(rawUsername: string): string {
    const username = rawUsername.trim();

    if (username.length < 2) {
      throw new BadRequestException("Username must contain at least 2 characters");
    }

    return username;
  }

  // Verifie le format et la taille d'un avatar en data URL.
  private assertAvatarDataUrlIsValid(avatarDataUrl: string): void {
    const match = avatarDataUrl.match(
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/,
    );

    if (!match) {
      throw new BadRequestException("Avatar must be a valid image file");
    }

    const mimeType = match[1];
    const base64Payload = match[2];

    if (!SUPPORTED_AVATAR_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(
        "Supported avatar formats are JPG, PNG and WEBP",
      );
    }

    const paddingLength = base64Payload.endsWith("==")
      ? 2
      : base64Payload.endsWith("=")
        ? 1
        : 0;
    const estimatedByteSize =
      Math.floor((base64Payload.length * 3) / 4) - paddingLength;

    if (estimatedByteSize <= 0) {
      throw new BadRequestException("Avatar must contain image data");
    }

    if (estimatedByteSize > MAX_AVATAR_SIZE_BYTES) {
      throw new BadRequestException("Avatar image must be 2 MB or smaller");
    }

    const decodedImage = Buffer.from(base64Payload, "base64");

    if (decodedImage.length !== estimatedByteSize) {
      throw new BadRequestException("Avatar contains invalid base64 data");
    }

    const detectedMimeType = this.detectAvatarMimeType(decodedImage);

    if (!detectedMimeType || detectedMimeType !== mimeType) {
      throw new BadRequestException(
        "Avatar content does not match the declared image format",
      );
    }
  }

  private detectAvatarMimeType(imageBuffer: Buffer): string | null {
    if (this.isJpegBuffer(imageBuffer)) {
      return "image/jpeg";
    }

    if (this.isPngBuffer(imageBuffer)) {
      return "image/png";
    }

    if (this.isWebpBuffer(imageBuffer)) {
      return "image/webp";
    }

    return null;
  }

  private isJpegBuffer(imageBuffer: Buffer): boolean {
    return (
      imageBuffer.length >= 3 &&
      imageBuffer[0] === 0xff &&
      imageBuffer[1] === 0xd8 &&
      imageBuffer[2] === 0xff
    );
  }

  private isPngBuffer(imageBuffer: Buffer): boolean {
    if (imageBuffer.length < PNG_SIGNATURE.length) {
      return false;
    }

    return PNG_SIGNATURE.every((byte, index) => imageBuffer[index] === byte);
  }

  private isWebpBuffer(imageBuffer: Buffer): boolean {
    return (
      imageBuffer.length >= 12 &&
      imageBuffer.toString("ascii", 0, 4) === "RIFF" &&
      imageBuffer.toString("ascii", 8, 12) === "WEBP"
    );
  }

  // Extrait les champs utiles d'un utilisateur pour la vue ami.
  buildFriendUserSummary(user: User): FriendUserSummary {
    return {
      id: user.id,
      username: user.username,
      isGuest: user.isGuest,
      avatar_url: user.avatar_url,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
