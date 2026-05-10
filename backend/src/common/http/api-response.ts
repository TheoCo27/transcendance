// Ce fichier centralise le format de reponse HTTP standard du backend.
export type ApiErrorPayload = {
  code: string;
  message: string;
};

// Reponse de succes contenant des donnees metier.
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  error: null;
};

// Reponse d'echec contenant un code et un message d'erreur standardises.
export type ApiFailureResponse = {
  success: false;
  data: null;
  error: ApiErrorPayload;
};

// Union des deux formes de reponse exposees par l'API.
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiFailureResponse;

// Construit rapidement une reponse de succes au format du projet.
export function ok<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    error: null,
  };
}
