import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TEMPLATES } from '@app/contracts';
import { TemplateListItemDto, TemplatePreviewDto } from './dto/template.dto';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  @Get()
  @ApiOperation({ summary: 'List all available email templates' })
  @ApiResponse({ status: 200, type: [TemplateListItemDto] })
  list(): TemplateListItemDto[] {
    return Object.values(TEMPLATES).map(({ id, name, description, subject, fields }) => ({
      id,
      name,
      description,
      subject,
      fields,
    }));
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Render a template with its preview data' })
  @ApiResponse({ status: 200, type: TemplatePreviewDto })
  @ApiResponse({ status: 404, description: 'Template not found' })
  preview(@Param('id') id: string): TemplatePreviewDto {
    const template = TEMPLATES[id];
    if (!template) {
      throw new NotFoundException(`Template "${id}" not found`);
    }
    return {
      id: template.id,
      subject: template.subject,
      html: template.html(template.previewData),
    };
  }
}
