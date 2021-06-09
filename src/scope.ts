export type SpanDescription = {
  id?: string;
  parentId?: string;
  op?: string;
  transaction?: string;
};

export class Span {
  public id: string = `${Math.round(Math.random() * 1e10)}`;
  public parentId?: string;

  public op: string;
  public transaction?: string;

  public started = Date.now();
  public finished?: number;

  public success: boolean = true;

  constructor(description: SpanDescription) {
    Object.assign(this, description);
  }

  public end() {
    this.finished = Date.now();
  }

  public error() {
    this.success = false;
  }
}

export class Scope {
  private span: Span;

  public clone(): Scope {
    const newScope = new Scope();
    Object.assign(newScope, this);
    return newScope;
  }

  public getSpan(): Span | undefined {
    return this.span;
  }

  public setSpan(span: Span) {
    this.span = span;
  }
}
