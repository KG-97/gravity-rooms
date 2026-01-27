import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error information to an external service
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
    }

    componentDidMount() {
        window.addEventListener('unhandledrejection', this.handleUnhandledPromiseRejection);
    }

    componentWillUnmount() {
        window.removeEventListener('unhandledrejection', this.handleUnhandledPromiseRejection);
    }

    handleUnhandledPromiseRejection = (event) => {
        this.setState({ hasError: true });
        console.error('Unhandled promise rejection:', event.reason);
    };

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return <h1>Something went wrong. Please try again later.</h1>;
        }

        return this.props.children; 
    }
}

export default ErrorBoundary;