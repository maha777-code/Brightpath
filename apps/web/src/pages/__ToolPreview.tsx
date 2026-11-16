import { useSearchParams } from 'react-router-dom';
import { ToolRenderer } from '@/components/tools/ToolRenderer';
import { INITIAL_TOOLS_REGISTRY } from '@/config/toolsRegistry';

export default function ToolPreview() {
  const [params] = useSearchParams();
  const id = params.get('id') ?? 'presentation-generator';
  const tool = INITIAL_TOOLS_REGISTRY.find((item) => item.id === id);
  if (!tool) return <pre>{INITIAL_TOOLS_REGISTRY.map((item) => `${item.id} ${item.componentKey}`).join('\n')}</pre>;
  return (
    <div className="flex h-screen w-full flex-col p-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl">
        <ToolRenderer key={id} tool={tool} embed={params.get('embed') === '1'} />
      </div>
    </div>
  );
}
