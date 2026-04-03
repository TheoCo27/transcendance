export type ApiErrorPayload = {
  code: string;
  message: string;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  error: null;
};

export type ApiFailureResponse = {
  success: false;
  data: null;
  error: ApiErrorPayload;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiFailureResponse;

export function ok<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    error: null,
  };
}

