import { useNavigate } from "react-router-dom";
import ArenaView from "../components/arena/ArenaView";

export default function Arena() {
  const navigate = useNavigate();

  return (
    <ArenaView
      variant="page"
      onOpenBuilder={() => navigate("/app")}
    />
  );
}
