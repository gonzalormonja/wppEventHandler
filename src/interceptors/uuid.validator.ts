import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class UuidValidator implements PipeTransform<string> {
  constructor(private readonly i18n: I18nService) {}

  transform(value: string, metadata: ArgumentMetadata) {
    if (uuidValidate(value) && uuidVersion(value) === 4) return value;

    throw new BadRequestException(
      this.i18n.translate('error.BAD_UUID', {
        args: { field: metadata.data },
      }),
    );
  }
}
