import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { AuthDto } from './dto/auth.dto';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: AuthDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase();
    const existingUser = await this.usersRepository.findOne({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });
    const passwordHash = await bcrypt.hash(dto.password, 12);

    if (existingUser?.passwordHash) {
      throw new ConflictException('An account with this email already exists.');
    }

    if (existingUser) {
      throw new ConflictException(
        'A legacy account with this email already exists. Use a different email or migrate the legacy user manually.',
      );
    }

    const user = await this.usersRepository.save(
      this.usersRepository.create({ email, passwordHash }),
    );

    return this.toAuthResponse(user);
  }

  async login(dto: AuthDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase();
    const user = await this.usersRepository.findOne({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.toAuthResponse(user);
  }

  async getMe(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User session is no longer valid.');
    }

    return {
      id: user.id,
      email: user.email,
    };
  }

  private toAuthResponse(user: User): AuthResponse {
    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        email: user.email,
      }),
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}
