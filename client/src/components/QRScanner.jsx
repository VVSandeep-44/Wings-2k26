
import React, { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';


const QRScanner = ({ onResult, constraints, style }) => {
	const videoRef = useRef(null);
	const codeReaderRef = useRef(null);
	useEffect(() => {
		const codeReader = new BrowserMultiFormatReader();
		codeReaderRef.current = codeReader;
		let isMounted = true;
		const startScan = async () => {
			try {
				const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
				const deviceId = videoInputDevices[0]?.deviceId;
				if (!deviceId) return;
				codeReader.decodeFromVideoDevice(
					deviceId,
					videoRef.current,
					(result, error, controls) => {
						if (!isMounted) return;
						if (result && onResult) {
							onResult({ text: result.getText() }, null);
							controls.stop();
						} else if (error && error.name !== 'NotFoundException' && onResult) {
							onResult(null, error);
						}
					}
				);
			} catch (err) {
				if (onResult) onResult(null, err);
			}
		};
		startScan();
		return () => {
			isMounted = false;
			if (codeReaderRef.current) {
				codeReaderRef.current.reset();
			}
		};
	}, [onResult]);
	return (
		<div
			style={{
				width: '100%',
				maxWidth: 350,
				margin: '0 auto',
				borderRadius: 12,
				overflow: 'hidden',
				background: '#111',
				...style,
			}}
		>
			<video
				ref={videoRef}
				style={{ width: '100%', aspectRatio: '1/1', background: '#000', objectFit: 'cover' }}
				muted
				autoPlay
				playsInline
			/>
		</div>
	);
};

export default QRScanner;