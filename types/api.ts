// API response envelope types — SRS §10 (RFC 7807 errors, consistent envelope).

export interface ApiSuccess<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  type: string;         // RFC 7807 problem type URI
  title: string;
  status: number;
  detail?: string;
  errors?: FieldError[];
}

export interface FieldError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedQuery {
  page?: number;
  limit?: number;
}
