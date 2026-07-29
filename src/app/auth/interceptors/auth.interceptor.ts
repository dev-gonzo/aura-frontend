import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { AuthService } from '../service/auth.service';

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/refresh');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  return from(authService.ensureAccessToken()).pipe(
    switchMap((token) => {
      const authorizedRequest = token
        ? req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          })
        : req;

      return next(authorizedRequest).pipe(
        catchError((error: unknown) => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !authService.session()) {
            return throwError(() => error);
          }

          return from(authService.refreshSession()).pipe(
            switchMap((session) => {
              if (!session) {
                authService.logout();
                return throwError(() => error);
              }

              return next(
                req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${session.token}`,
                  },
                })
              );
            }),
            catchError((refreshError) => {
              authService.logout();
              return throwError(() => refreshError);
            })
          );
        })
      );
    })
  );
};
