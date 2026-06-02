import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type HttpRequest = {
  method?: string;
  path?: string;
  url?: string;
  headers: {
    authorization?: string;
    Authorization?: string;
  };
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<HttpRequest>();

    if (this.isPublicRequest(request)) {
      return true;
    }

    const expectedToken = this.configService.get<string>('APP_ACCESS_TOKEN');

    if (!expectedToken) {
      throw new UnauthorizedException(
        'APP_ACCESS_TOKEN is not configured for this API.',
      );
    }

    const authorization =
      request.headers.authorization ?? request.headers.Authorization ?? '';
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (token !== expectedToken) {
      throw new UnauthorizedException('Invalid or missing access token.');
    }

    return true;
  }

  private isPublicRequest(request: HttpRequest): boolean {
    if (request.method === 'OPTIONS') {
      return true;
    }

    const path = request.path ?? request.url ?? '';

    return path === '/api/health' || path === '/health';
  }
}
