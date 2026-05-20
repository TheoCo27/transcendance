export const connectRoomErrorMsg: Record<string, string> = {
  auth_required: "Connecte-toi pour rejoindre une room.",
  room_not_found: "Room introuvable.",
  room_full: "Room pleine.",
  already_in_room: "Déjà dans la room.",
  invalid_link: "Le lien ou le nom de room que vous avez entré est invalide.",
  unknown_error:
    "Une erreur est survenue lors de la connexion à la room. Veuillez réessayer.",
};

export const createRoomErrorMsg: Record<string, string> = {
  auth_required: "Connecte-toi pour créer une room.",
  unknown_error:
    "Une erreur est survenue lors de la création de la room. Veuillez réessayer.",
};

export const oauthErrorMsg: Record<string, string> = {
  google_access_denied: "La connexion Google a été annulée.",
  google_callback_failed:
    "Impossible de finaliser la connexion Google. Vérifie la configuration OAuth.",
  google_not_configured: "La connexion Google n'est pas encore configurée.",
  google_state_mismatch:
    "La tentative de connexion Google a expiré. Réessaie depuis cette page.",
};
