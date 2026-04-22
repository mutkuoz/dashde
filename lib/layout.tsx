import { Gtk } from "astal/gtk4";
import { widthsForRow, type DashboardConfig } from "./config";
import { missingWidget, safeRender } from "./boundary";
import { resolve } from "./registry";
import { logger } from "./logger";

const log = logger("layout");

/**
 * Render the YAML `layout` array into a grid. We use Gtk.Grid with column_homogeneous
 * so that relative widths map cleanly to col_spans summed across the row.
 */
export function renderLayout(cfg: DashboardConfig): Gtk.Widget {
  if (cfg.layout.length === 0) {
    return (
      <box
        cssClasses={["empty-state"]}
        orientation={Gtk.Orientation.VERTICAL}
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
      >
        <label cssClasses={["greeting"]} label="no layout configured" />
        <label
          cssClasses={["muted"]}
          label="create ~/.config/dashboard/config.yaml or run install.sh"
        />
      </box>
    );
  }

  return (
    <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["rows"]} spacing={14}>
      {cfg.layout.map((row, rowIdx) => renderRow(row ?? [], rowIdx, cfg))}
    </box>
  );
}

function renderRow(row: (string | null)[], rowIdx: number, cfg: DashboardConfig): Gtk.Widget {
  const safeRow = row.filter((x) => x !== undefined);
  if (safeRow.length === 0) return <box /> as Gtk.Widget;

  const widths = widthsForRow(rowIdx, safeRow.length, cfg);
  const total = widths.reduce((a, b) => a + b, 0);

  const grid = (
    <Gtk.Grid
      cssClasses={["row"]}
      columnHomogeneous
      columnSpacing={14}
      rowSpacing={14}
      hexpand
    />
  ) as unknown as Gtk.Grid;

  let col = 0;
  safeRow.forEach((cellId, cellIdx) => {
    const span = widths[cellIdx];
    const cell = renderCell(cellId, cfg);
    grid.attach(cell, col, 0, span, 1);
    col += span;
  });

  if (col < total) log.debug(`row ${rowIdx} underfilled: ${col}/${total}`);

  return grid as unknown as Gtk.Widget;
}

function renderCell(id: string | null, cfg: DashboardConfig): Gtk.Widget {
  if (!id) return <box cssClasses={["spacer"]} /> as Gtk.Widget;

  const instance = cfg.widgets[id];
  if (!instance) {
    log.warn(`layout references missing widget id: ${id}`);
    return missingWidget(id);
  }

  const mod = resolve(instance.type);
  if (!mod) {
    log.warn(`widget id ${id} has unknown type: ${instance.type}`);
    return missingWidget(`${id} (type "${instance.type}")`);
  }

  if (mod.validate) {
    const err = mod.validate(instance);
    if (err) {
      log.warn(`widget ${id} config invalid: ${err}`);
      return missingWidget(`${id}: ${err}`);
    }
  }

  return safeRender(instance.type, id, () => mod.render(instance, id));
}
