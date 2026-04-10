import { IsNotEmpty, IsNumber, IsPositive, IsString, Min } from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  reorderLevel: number;

  @IsNumber()
  @IsPositive()
  costPerUnit: number;
}
