import { ResolveFn } from '@angular/router';

export const adminRoutesResolver: ResolveFn<boolean> = (route, state) => {
  return true;
};
