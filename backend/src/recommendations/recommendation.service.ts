import { Injectable } from '@nestjs/common';
import { FindingSeverity } from '../aws-scanner/interfaces/finding.interface';
import {
  RecommendationContext,
  RecommendationType,
  recommendationRules,
} from './rules';

export interface BuiltRecommendation {
  type: RecommendationType;
  severity: FindingSeverity;
  message: string;
  recommendation: string;
  fixCommand?: string;
}

@Injectable()
export class RecommendationService {
  build(
    type: RecommendationType,
    context: RecommendationContext = {},
  ): BuiltRecommendation {
    const rule = recommendationRules[type];

    return {
      type: rule.type,
      severity: rule.severity,
      message: rule.buildMessage(context),
      recommendation: rule.buildRecommendation(context),
      fixCommand: rule.buildFixCommand?.(context),
    };
  }
}
