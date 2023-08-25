export function RelativeFormat(date: Date) {
	const now = new Date(Date.now());

	const diff = now.getDate() - date.getDate();

	if (diff === -1) {
		return `Tomorrow at ${date
			.toLocaleTimeString('en-US')
			.replace(/(.*)\D\d+/, '$1')}`;
	} else if (diff === 0) {
		return `Today at ${date
			.toLocaleTimeString('en-US')
			.replace(/(.*)\D\d+/, '$1')}`;
	} else if (diff === 1) {
		return `Yesterday at ${date
			.toLocaleTimeString('en-US')
			.replace(/(.*)\D\d+/, '$1')}`;
	} else {
		return `${date.toDateString()} ${date
			.toLocaleTimeString('en-US')
			.replace(/(.*)\D\d+/, '$1')}`;
	}
}
