declare module 'pell' {
  export interface PellAction {
    name?: string;
    icon?: string;
    title?: string;
    result?: () => boolean | void;
  }

  export interface PellClasses {
    actionbar?: string;
    button?: string;
    content?: string;
    selected?: string;
  }

  export interface PellSettings {
    element: HTMLElement;
    defaultParagraphSeparator?: string;
    actions?: Array<string | PellAction>;
    classes?: PellClasses;
    styleWithCSS?: boolean;
    onChange: (html: string) => void;
  }

  export interface PellEditor {
    content: HTMLDivElement;
  }

  export function exec(command: string, value?: string | null): boolean;
  export function init(settings: PellSettings): PellEditor;
}
