import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthSession } from "../hooks/useAuthSession";

export default function RoomPage() {
  const { roomId: roomIdParam } = useParams();
  const roomId = Number(roomIdParam);
  const navigate = useNavigate();
  const { user, isLoading } = useAuthSession();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, navigate, user]);

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="flex-1">
      <h1>RoomPage</h1>
    </div>
  );
}
