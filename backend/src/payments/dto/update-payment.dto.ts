import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyChapaDto {
  @IsString()
  @IsNotEmpty()
  txRef: string;
}
