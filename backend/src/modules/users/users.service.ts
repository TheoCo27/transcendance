import { PrismaService } from "@/prisma/prisma.service";
import { FriendshipStatus, Prisma, User } from "@generated/prisma/client";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.findUser({ email });
  }

  async findUserByUsername(username: string): Promise<User | null> {
    const users = await this.findUsersByUsername(username, 1);

    return users[0] ?? null;
  }

  async findUsersByUsername(username: string, take?: number): Promise<User[]> {
    return this.findUsers({
      where: { username },
      take,
      orderBy: { id: "asc" },
    });
  }

  async findUser(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    return this.prisma.client.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

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

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.client.user.create({
      data,
    });
  }

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

  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return this.prisma.client.user.delete({
      where,
    });
  }

  async getFriendOverview(userId: number): Promise<FriendOverview> {
    const currentUser = await this.findUser({ id: userId });

    if (!currentUser) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    this.ensureFriendSystemAvailable(currentUser);

    const [acceptedRelations, receivedRequests, sentRequests] = await Promise.all([
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
      const friend = relation.senderId === userId ? relation.receiver : relation.sender;

      if (!friend.isGuest) {
        uniqueFriends.set(friend.id, this.sanitizeFriendUser(friend));
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
          user: this.sanitizeFriendUser(relation.sender),
        })),
      sentRequests: sentRequests
        .filter((relation) => !relation.receiver.isGuest)
        .map((relation) => ({
          id: relation.id,
          status: relation.status,
          createdAt: relation.createdAt,
          user: this.sanitizeFriendUser(relation.receiver),
        })),
    };
  }

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
      throw new NotFoundException("No user found with this username");
    }

    if (matchingUsers.length > 1) {
      throw new ConflictException(
        "This username is ambiguous. Ask the user to rename their account.",
      );
    }

    const receiver = matchingUsers[0];

    if (receiver.id === senderId) {
      throw new BadRequestException("You cannot add yourself as a friend");
    }

    this.ensureFriendSystemAvailable(receiver);

    const activeRelation = await this.getActiveFriendRelation(senderId, receiver.id);

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

    await this.prisma.client.friendRequests.create({
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

  private ensureFriendSystemAvailable(user: User): void {
    if (user.isGuest) {
      throw new ForbiddenException(
        "The friend system is not available for guest accounts",
      );
    }
  }

  private sanitizeFriendUser(user: User): FriendUserSummary {
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
