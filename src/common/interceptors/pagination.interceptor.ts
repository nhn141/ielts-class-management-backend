import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class PaginationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((res) => {
        // If response is an object with { data, total }
        if (res && typeof res === 'object' && 'data' in res && 'total' in res) {
          response.setHeader('x-total-count', res.total);
          response.setHeader('Access-Control-Expose-Headers', 'x-total-count');
          return res.data;
        }
        return res;
      }),
    );
  }
}
