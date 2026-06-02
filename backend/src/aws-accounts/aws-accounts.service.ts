import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EncryptionService } from '../security/encryption.service';
import { User } from '../users/user.entity';
import { AwsAccount } from './aws-account.entity';
import { CreateAwsAccountDto } from './dto/create-aws-account.dto';

export interface AwsAccountResponse {
  id: string;
  accountName: string;
  accessKeyId: string;
  region: string;
  user: {
    id: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AwsAccountsService {
  constructor(
    @InjectRepository(AwsAccount)
    private readonly awsAccountsRepository: Repository<AwsAccount>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async create(
    userId: string,
    createAwsAccountDto: CreateAwsAccountDto,
  ): Promise<AwsAccountResponse> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('The authenticated user was not found.');
    }

    const awsAccount = this.awsAccountsRepository.create({
      accountName: createAwsAccountDto.accountName,
      accessKeyId: createAwsAccountDto.accessKeyId,
      secretAccessKey: this.encryptionService.encrypt(
        createAwsAccountDto.secretAccessKey,
      ),
      region: createAwsAccountDto.region,
      user,
    });

    const savedAwsAccount = await this.awsAccountsRepository.save(awsAccount);

    return this.toResponse(savedAwsAccount);
  }

  async findAll(userId: string): Promise<AwsAccountResponse[]> {
    const awsAccounts = await this.awsAccountsRepository.find({
      where: { user: { id: userId } },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    return awsAccounts.map((awsAccount) => this.toResponse(awsAccount));
  }

  async findOne(userId: string, id: string): Promise<AwsAccountResponse> {
    const awsAccount = await this.awsAccountsRepository.findOne({
      where: { id, user: { id: userId } },
      relations: { user: true },
    });

    if (!awsAccount) {
      throw new NotFoundException(
        `AWS account "${id}" was not found. Check the account id and try again.`,
      );
    }

    return this.toResponse(awsAccount);
  }

  async remove(userId: string, id: string): Promise<void> {
    const awsAccount = await this.awsAccountsRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!awsAccount) {
      throw new NotFoundException(
        `AWS account "${id}" was not found. It may have already been deleted.`,
      );
    }

    await this.awsAccountsRepository.remove(awsAccount);
  }

  private toResponse(awsAccount: AwsAccount): AwsAccountResponse {
    return {
      id: awsAccount.id,
      accountName: awsAccount.accountName,
      accessKeyId: awsAccount.accessKeyId,
      region: awsAccount.region,
      user: {
        id: awsAccount.user.id,
        email: awsAccount.user.email,
      },
      createdAt: awsAccount.createdAt,
      updatedAt: awsAccount.updatedAt,
    };
  }
}
