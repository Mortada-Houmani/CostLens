import { IsNotEmpty, IsString, Matches } from 'class-validator';

const AWS_REGION_PATTERN = /^[a-z]{2}(?:-[a-z]+)+-\d$/;

export class CreateAwsAccountDto {
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @IsString()
  @IsNotEmpty()
  accessKeyId: string;

  @IsString()
  @IsNotEmpty()
  secretAccessKey: string;

  @IsString()
  @IsNotEmpty()
  @Matches(AWS_REGION_PATTERN, {
    message: 'region must be a valid AWS region, such as eu-central-1',
  })
  region: string;
}
