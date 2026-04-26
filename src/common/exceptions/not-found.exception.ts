import { NotFoundException as NestNotFoundException } from '@nestjs/common';

/**
 * NotFoundException
 * Thrown when a requested entity is not found
 */
export class NotFoundException extends NestNotFoundException {
  constructor(entityType: string, entityId: string) {
    super({
      statusCode: 404,
      message: `${entityType} not found: ${entityId}`,
      error: 'NOT_FOUND',
      context: {
        entityType,
        entityId,
      },
    });
  }
}
