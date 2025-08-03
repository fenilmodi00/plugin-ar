import { ArweaveError, ArweaveErrorCode } from "../types/arweave.types";

/**
 * Validates an Arweave address format
 */
export function validateAddress(address: string): string {
  if (!address || typeof address !== "string") {
    throw new ArweaveError(
      "Address is required",
      ArweaveErrorCode.INVALID_PARAMETERS,
    );
  }

  const trimmed = address.trim();
  if (!trimmed.match(/^[a-zA-Z0-9_-]{43}$/)) {
    throw new ArweaveError(
      "Invalid Arweave address format",
      ArweaveErrorCode.INVALID_PARAMETERS,
    );
  }

  return trimmed;
}

/**
 * Validates an amount (must be positive number)
 */
export function validateAmount(amount: string): number {
  if (!amount || typeof amount !== "string") {
    throw new ArweaveError(
      "Amount is required",
      ArweaveErrorCode.INVALID_PARAMETERS,
    );
  }

  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    throw new ArweaveError(
      "Amount must be a positive number",
      ArweaveErrorCode.INVALID_PARAMETERS,
    );
  }

  return num;
}

/**
 * Validates content type
 */
export function validateContentType(contentType: string): string {
  if (!contentType || typeof contentType !== "string") {
    throw new ArweaveError(
      "Content type is required",
      ArweaveErrorCode.INVALID_PARAMETERS,
    );
  }

  const trimmed = contentType.trim();
  if (trimmed.length === 0) {
    throw new ArweaveError(
      "Content type cannot be empty",
      ArweaveErrorCode.INVALID_PARAMETERS,
    );
  }

  return trimmed;
}

/**
 * Validates transaction ID format
 */
export function validateTransactionId(transactionId: string): string {
  if (!transactionId || typeof transactionId !== "string") {
    throw new ArweaveError(
      "Transaction ID is required",
      ArweaveErrorCode.INVALID_PARAMETERS,
    );
  }

  const trimmed = transactionId.trim();
  if (!trimmed.match(/^[a-zA-Z0-9_-]{43}$/)) {
    throw new ArweaveError(
      "Invalid transaction ID format",
      ArweaveErrorCode.INVALID_PARAMETERS,
    );
  }

  return trimmed;
}

/**
 * Validates tags format
 */
export function validateTags(
  tags: { name: string; values: string[] }[],
): { name: string; values: string[] }[] {
  if (!tags || !Array.isArray(tags)) {
    throw new ArweaveError(
      "Tags must be an array",
      ArweaveErrorCode.INVALID_PARAMETERS,
    );
  }

  if (tags.length === 0) {
    throw new ArweaveError(
      "At least one tag is required",
      ArweaveErrorCode.INVALID_PARAMETERS,
    );
  }

  return tags.map((tag) => {
    if (!tag.name || typeof tag.name !== "string") {
      throw new ArweaveError(
        "Tag name is required",
        ArweaveErrorCode.INVALID_PARAMETERS,
      );
    }

    if (!tag.values || !Array.isArray(tag.values) || tag.values.length === 0) {
      throw new ArweaveError(
        "Tag values must be a non-empty array",
        ArweaveErrorCode.INVALID_PARAMETERS,
      );
    }

    return {
      name: tag.name.trim(),
      values: tag.values.map((value) => {
        if (typeof value !== "string") {
          throw new ArweaveError(
            "Tag values must be strings",
            ArweaveErrorCode.INVALID_PARAMETERS,
          );
        }
        return value.trim();
      }),
    };
  });
}
