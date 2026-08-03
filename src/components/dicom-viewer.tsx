"use client";

import { useEffect, useId, useRef, useState } from "react";

export type DicomViewerSeries = {
  id: string;
  instances: { id: string; instanceNumber: number }[];
};

let cornerstoneReady: Promise<void> | null = null;

async function ensureCornerstoneInitialized() {
  if (!cornerstoneReady) {
    cornerstoneReady = (async () => {
      const core = await import("@cornerstonejs/core");
      const dicomImageLoader = await import("@cornerstonejs/dicom-image-loader");
      const tools = await import("@cornerstonejs/tools");
      await core.init();
      await dicomImageLoader.init();
      tools.init();
    })();
  }
  return cornerstoneReady;
}

async function resolveImageIds(instances: { id: string; instanceNumber: number }[]) {
  const sorted = [...instances].sort((a, b) => a.instanceNumber - b.instanceNumber);
  const urls = await Promise.all(
    sorted.map(async (instance) => {
      const res = await fetch(`/api/imaging/${instance.id}/url`);
      if (!res.ok) throw new Error("Failed to get a viewing URL for one of the images");
      const { url } = await res.json();
      return `wadouri:${url}`;
    })
  );
  return urls;
}

/**
 * Single-instance studies (X-ray/ultrasound) get a 2D stack viewport with
 * zoom/pan/window-level. Multi-slice series (CT/MRI) additionally get a
 * volume built from the same imageIds, rendered as axial/sagittal/coronal
 * MPR — Cornerstone3D's native volume-rendering path, not custom 3D code.
 */
export function DicomViewer({ series }: { series: DicomViewerSeries }) {
  const stackElementRef = useRef<HTMLDivElement>(null);
  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "rendered" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const engineId = useId();
  const isMultiSlice = series.instances.length > 1;

  useEffect(() => {
    let cancelled = false;
    let renderingEngine: import("@cornerstonejs/core").RenderingEngine | undefined;

    async function run() {
      try {
        await ensureCornerstoneInitialized();
        const core = await import("@cornerstonejs/core");
        const tools = await import("@cornerstonejs/tools");

        if (cancelled || !stackElementRef.current) return;

        const imageIds = await resolveImageIds(series.instances);
        if (cancelled) return;

        renderingEngine = new core.RenderingEngine(`imagingEngine-${engineId}`);
        const stackViewportId = "STACK";
        renderingEngine.enableElement({
          viewportId: stackViewportId,
          element: stackElementRef.current,
          type: core.Enums.ViewportType.STACK,
        });
        const stackViewport = renderingEngine.getViewport(stackViewportId) as unknown as {
          setStack: (imageIds: string[]) => Promise<void>;
          render: () => void;
        };
        await stackViewport.setStack(imageIds);
        stackViewport.render();

        const toolGroupId = `imagingTools-${engineId}`;
        const toolGroup = tools.ToolGroupManager.createToolGroup(toolGroupId);
        if (toolGroup) {
          tools.addTool(tools.ZoomTool);
          tools.addTool(tools.PanTool);
          tools.addTool(tools.WindowLevelTool);
          toolGroup.addTool(tools.ZoomTool.toolName);
          toolGroup.addTool(tools.PanTool.toolName);
          toolGroup.addTool(tools.WindowLevelTool.toolName);
          toolGroup.addViewport(stackViewportId, renderingEngine.id);
          toolGroup.setToolActive(tools.WindowLevelTool.toolName, {
            bindings: [{ mouseButton: tools.Enums.MouseBindings.Primary }],
          });
          toolGroup.setToolActive(tools.PanTool.toolName, {
            bindings: [{ mouseButton: tools.Enums.MouseBindings.Auxiliary }],
          });
          toolGroup.setToolActive(tools.ZoomTool.toolName, {
            bindings: [{ mouseButton: tools.Enums.MouseBindings.Secondary }],
          });
        }

        if (isMultiSlice && axialRef.current && sagittalRef.current && coronalRef.current) {
          const volumeId = `volume-${engineId}`;
          const volume = await core.volumeLoader.createAndCacheVolume(volumeId, { imageIds });
          volume.load();

          renderingEngine.setViewports([
            { viewportId: "AXIAL", element: axialRef.current, type: core.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: core.Enums.OrientationAxis.AXIAL } },
            { viewportId: "SAGITTAL", element: sagittalRef.current, type: core.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: core.Enums.OrientationAxis.SAGITTAL } },
            { viewportId: "CORONAL", element: coronalRef.current, type: core.Enums.ViewportType.ORTHOGRAPHIC, defaultOptions: { orientation: core.Enums.OrientationAxis.CORONAL } },
          ]);
          await core.setVolumesForViewports(renderingEngine, [{ volumeId }], ["AXIAL", "SAGITTAL", "CORONAL"]);
          renderingEngine.renderViewports(["AXIAL", "SAGITTAL", "CORONAL"]);
        }

        if (!cancelled) setStatus("rendered");

        // The panel elements are sized by CSS (percentage/aspect-ratio, not
        // fixed px) so they can shrink on narrow screens — Cornerstone
        // doesn't watch for that itself, so a ResizeObserver drives its
        // resize() explicitly whenever the actual element box changes.
        const observedElements = [stackElementRef.current, axialRef.current, sagittalRef.current, coronalRef.current].filter(
          (el): el is HTMLDivElement => el !== null
        );
        const engineForResize = renderingEngine;
        resizeObserver = new ResizeObserver(() => {
          engineForResize?.resize(true, true);
        });
        for (const el of observedElements) resizeObserver.observe(el);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
      }
    }

    let resizeObserver: ResizeObserver | undefined;
    run();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      renderingEngine?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series.id]);

  return (
    <div className="flex flex-col gap-3">
      {status === "loading" && <p className="text-sm text-muted-foreground">Loading images…</p>}
      {status === "error" && <p className="text-sm text-destructive">Couldn&apos;t load this study: {error}</p>}
      <div>
        <p className="mb-1 text-xs text-muted-foreground">2D — drag to window/level, middle-drag to pan, right-drag to zoom</p>
        <div ref={stackElementRef} className="aspect-square w-full max-w-[512px] bg-black" />
      </div>
      {isMultiSlice && (
        <div>
          <p className="mb-1 text-xs text-muted-foreground">3D volume (MPR)</p>
          <div className="flex flex-wrap gap-2">
            <div ref={axialRef} className="aspect-square min-w-[160px] max-w-[400px] flex-1 basis-[220px] bg-black" />
            <div ref={sagittalRef} className="aspect-square min-w-[160px] max-w-[400px] flex-1 basis-[220px] bg-black" />
            <div ref={coronalRef} className="aspect-square min-w-[160px] max-w-[400px] flex-1 basis-[220px] bg-black" />
          </div>
        </div>
      )}
    </div>
  );
}
