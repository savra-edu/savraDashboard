/** Chart JSON emitted inside ```chart ... ``` blocks by the Data Agent LLM */

export type AgentCartesianSpec = {
  type: 'bar' | 'line' | 'area';
  title?: string;
  data: Record<string, unknown>[];
  categoryKey: string;
  valueKeys: string[];
  valueLabels?: Record<string, string>;
};

export type AgentPieSpec = {
  type: 'pie';
  title?: string;
  data: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
};

export type AgentChartSpec = AgentCartesianSpec | AgentPieSpec;
