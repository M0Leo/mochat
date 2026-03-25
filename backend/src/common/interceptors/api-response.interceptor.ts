import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: object | Record<string, unknown> | T;
  message?: string;
  meta?: unknown;
}

@Injectable()
export class APIResponseInterceptor<T>
  implements NestInterceptor<T, Record<string, unknown> | Response<T> | void>
{
  constructor(private readonly options: { excludeEndpoints: string[] }) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Record<string, unknown> | Response<T> | void> {
    const http = context.switchToHttp();
    const req = http.getRequest<ExpressRequest>();
    const res = http.getResponse<ExpressResponse>();

    return next.handle().pipe(
      map<T, Record<string, unknown> | Response<T> | void>((data: T) => {
        const responseData: any =
          data === null || data === undefined ? {} : data;

        if (this.options.excludeEndpoints.includes(req.path)) {
          return responseData;
        }

        if (Object.keys(responseData).length === 0) {
          res.status(HttpStatus.NO_CONTENT);
          return;
        }

        const meta = responseData.meta ?? null;
        const message = responseData.message ?? 'success';

        if (meta) delete responseData.meta;
        if (responseData.message) delete responseData.message;

        return {
          message,
          data: responseData.data ?? responseData,
          ...(meta && { meta }),
        };
      }),
    );
  }
}