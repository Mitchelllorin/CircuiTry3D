import { jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, message: error instanceof Error ? error.message : String(error) };
    }
    componentDidCatch(error) {
        // Later: send to observability if needed
        console.error('ErrorBoundary caught error', error);
    }
    render() {
        if (this.state.hasError) {
            return _jsxs("div", { style: { padding: 16, color: '#ff6b6b' }, children: ["Something went wrong: ", this.state.message] });
        }
        return this.props.children;
    }
}
