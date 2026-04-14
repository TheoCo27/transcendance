import { useParams } from "react-router-dom";
import LobbyScreen from "../components/Quiz/LobbyScreen";
import RoomScreen from "../components/Quiz/RoomScreen";

export default function HomePage() {
  const { roomId: roomIdParam } = useParams();
  const requestedRoomId = roomIdParam ? Number(roomIdParam) : null;
  const isRoomRoute =
    requestedRoomId !== null && Number.isInteger(requestedRoomId) && requestedRoomId > 0;

  return (
    <main className="flex flex-1 px-[10%] py-6">
      {isRoomRoute ? (
        <RoomScreen requestedRoomId={requestedRoomId} />
      ) : (
        <LobbyScreen />
      )}
    </main>
  );
}
