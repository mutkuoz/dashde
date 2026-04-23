import { Gtk } from "ags/gtk4";

interface PanelProps {
  title?: string;
  titleSuffix?: Gtk.Widget | null;
  children: Gtk.Widget | Gtk.Widget[];
  extraClass?: string;
  scrollable?: boolean;
  onPrimary?: () => void;
}

/**
 * A card. Title row: "section" label + hairline rule underneath (per spec),
 * with an optional right-aligned suffix sharing the row.
 */
export function Panel(props: PanelProps): Gtk.Widget {
  const { title, titleSuffix, children, extraClass, scrollable, onPrimary } = props;

  const classes = ["panel"];
  if (extraClass) classes.push(extraClass);

  const content = (
    <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["panel__body"]}>
      {title !== undefined && (
        <box cssClasses={["panel__head"]} orientation={Gtk.Orientation.HORIZONTAL}>
          <box
            cssClasses={["section-wrap"]}
            orientation={Gtk.Orientation.VERTICAL}
            halign={Gtk.Align.START}
            hexpand
          >
            <label cssClasses={["section"]} halign={Gtk.Align.START} label={title} />
            <box cssClasses={["section__rule"]} halign={Gtk.Align.START} />
          </box>
          {titleSuffix ?? null}
        </box>
      )}
      {scrollable ? (
        <Gtk.ScrolledWindow
          cssClasses={["panel__scroll"]}
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          vexpand
        >
          <box orientation={Gtk.Orientation.VERTICAL}>{children}</box>
        </Gtk.ScrolledWindow>
      ) : (
        children
      )}
    </box>
  );

  if (onPrimary) {
    return (
      <button cssClasses={classes} onClicked={onPrimary}>
        {content}
      </button>
    );
  }
  return <box cssClasses={classes}>{content}</box>;
}

/**
 * A horizontal flourish: hairline, centered ◆, hairline. For section breaks.
 */
export function Ornament(): Gtk.Widget {
  return (
    <box cssClasses={["ornament"]} orientation={Gtk.Orientation.HORIZONTAL} hexpand>
      <box cssClasses={["ornament__rule"]} hexpand />
      <label cssClasses={["ornament__glyph"]} label="◆" />
      <box cssClasses={["ornament__rule"]} hexpand />
    </box>
  );
}
