'use client';

import { Fragment } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { splitAssistantContent } from './parseAgentCharts';
import { AgentChart, tryParseChartSpec } from './AgentChart';

const mdComponents = {
  table: ({ children, ...props }: React.ComponentProps<'table'>) => (
    <div className="agent-table-scroll">
      <table className="agent-md-table" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ ...props }: React.ComponentProps<'thead'>) => <thead {...props} />,
  tbody: ({ ...props }: React.ComponentProps<'tbody'>) => <tbody {...props} />,
  tr: ({ ...props }: React.ComponentProps<'tr'>) => <tr {...props} />,
  th: ({ ...props }: React.ComponentProps<'th'>) => <th {...props} />,
  td: ({ ...props }: React.ComponentProps<'td'>) => <td {...props} />,
  p: ({ ...props }: React.ComponentProps<'p'>) => <p {...props} />,
  h3: ({ ...props }: React.ComponentProps<'h3'>) => <h3 {...props} />,
  code: ({ ...props }: React.ComponentProps<'code'>) => <code {...props} />,
  strong: ({ ...props }: React.ComponentProps<'strong'>) => <strong {...props} />,
  a: ({ ...props }: React.ComponentProps<'a'>) => <a {...props} />,
};

export function AssistantMessageContent({ content }: { content: string }) {
  const segments = splitAssistantContent(content);

  return (
    <>
      {segments.map((seg, i) =>
        seg.kind === 'markdown' ? (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={mdComponents}>
            {seg.text}
          </ReactMarkdown>
        ) : (
          <Fragment key={i}>
            {(() => {
              const spec = tryParseChartSpec(seg.json);
              if (!spec) {
                return (
                  <pre
                    className="agent-chart-error"
                    style={{
                      margin: '1rem 0',
                      padding: '0.75rem',
                      fontSize: '0.75rem',
                      overflow: 'auto',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--card-border)',
                      background: '#fef2f2',
                      color: 'var(--danger, #b91c1c)',
                    }}
                  >
                    Could not parse chart JSON. Expected schema with type bar|line|area|pie.
                  </pre>
                );
              }
              return <AgentChart spec={spec} />;
            })()}
          </Fragment>
        )
      )}
    </>
  );
}
