import { Component, ErrorInfo, ReactNode } from "react";

interface State {
  hasError: boolean;
}
interface Props {
  children: ReactNode;
}
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public componentDidCatch(err: Error, errorInfo: ErrorInfo) {
    this.setState({ hasError: true });
    // eslint-disable-next-line no-console
    console.error("EBC", err, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="h-[100vh] flex items-center justify-center ">
          Oops. An error occured unexpectedly
        </p>
      );
    }
    return this.props.children;
  }
}
