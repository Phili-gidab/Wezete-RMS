import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Category ──

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

// ── MenuItem inventory link ──

export class InventoryItemInput {
  @IsUUID()
  inventoryItemId: string;

  @IsNumber()
  @Min(0)
  quantityUsed: number;
}

// ── MenuItem ──

export class CreateMenuItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  prepTime?: number;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemInput)
  inventoryItems?: InventoryItemInput[];
}
