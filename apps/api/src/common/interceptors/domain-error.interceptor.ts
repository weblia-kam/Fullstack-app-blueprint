import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { DomainError } from "@org/domain";

@Injectable()
export class DomainErrorInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        if (error instanceof DomainError) {
          const status = this.mapStatus(error.code);
          const responseBody = {
            error: error.code,
            message: error.message,
            ...(error.meta ? { details: this.sanitizeMeta(error.meta) } : {}),
          };
          return throwError(() => new HttpException(responseBody, status));
        }
        return throwError(() => error);
      }),
    );
  }

  private mapStatus(code: string): number {
    switch (code) {
      case "USER_NOT_FOUND":
        return HttpStatus.NOT_FOUND;
      case "VALIDATION_ERROR":
        return HttpStatus.BAD_REQUEST;
      case "DUPLICATE_RESOURCE":
        return HttpStatus.CONFLICT;
      case "INVALID_TOKEN":
        return HttpStatus.UNAUTHORIZED;
      case "TOKEN_ISSUANCE_FORBIDDEN":
        return HttpStatus.FORBIDDEN;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (/password|secret|token|hash/i.test(key)) {
        sanitized[key] = "[redacted]";
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
