import { createStylesServer, ServerStyles } from '@mantine/next';
import { Head, Html, Main, NextScript } from 'next/document';
import Document, { DocumentContext } from 'next/document';

import { mantineCache } from '../utils/mantineCache';

const stylesServer = createStylesServer(mantineCache);

export default class _Document extends Document {
	static async getInitialProps(ctx: DocumentContext) {
		const initialProps = await Document.getInitialProps(ctx);

		return {
			...initialProps,
			styles: [
				initialProps.styles,
				<ServerStyles
					html={initialProps.html}
					server={stylesServer}
					key="styles"
				/>,
			],
		};
	}

	render() {
		return (
			<Html lang="en">
				<Head />
				<body>
					<Main />
					<NextScript />
				</body>
			</Html>
		);
	}
}
