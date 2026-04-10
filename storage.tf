###############################################################################
# Wezete Restaurant Management System – Storage (S3)
###############################################################################

resource "aws_s3_bucket" "wezete_receipts_menus" {
  bucket = "${var.project_name}-receipts-menus"

  tags = {
    Name = "${var.project_name}-receipts-menus"
  }
}

# Block ALL public access
resource "aws_s3_bucket_public_access_block" "wezete_receipts_menus" {
  bucket = aws_s3_bucket.wezete_receipts_menus.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning
resource "aws_s3_bucket_versioning" "wezete_receipts_menus" {
  bucket = aws_s3_bucket.wezete_receipts_menus.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption (AES-256, free)
resource "aws_s3_bucket_server_side_encryption_configuration" "wezete_receipts_menus" {
  bucket = aws_s3_bucket.wezete_receipts_menus.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
