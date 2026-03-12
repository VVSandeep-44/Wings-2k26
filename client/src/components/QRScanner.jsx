

import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';


const QRScanner = ({ onResult, constraints, style }) => {
	const videoRef = useRef(null);
	const codeReaderRef = useRef(null);
	const [errorMsg, setErrorMsg] = useState('');
	const [permissionDenied, setPermissionDenied] = useState(false);
	useEffect(() => {
		const codeReader = new BrowserMultiFormatReader();
		codeReaderRef.current = codeReader;
		let isMounted = true;
		const startScan = async () => {
			try {
				const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
				// Prefer environment-facing camera if available
				let deviceId = videoInputDevices[0]?.deviceId;
				for (const device of videoInputDevices) {
					if (device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('environment')) {
						deviceId = device.deviceId;
						break;
					}
				}
				if (!deviceId) {
					setErrorMsg('No camera device found.');
					return;
				}
				codeReader.decodeFromVideoDevice(
					deviceId,
					videoRef.current,
					(result, error, controls) => {
						if (!isMounted) return;
						if (result && onResult) {
							onResult({ text: result.getText() }, null);
							controls.stop();
						} else if (error && error.name === 'NotAllowedError') {
							setPermissionDenied(true);
							setErrorMsg('Camera permission denied. Please allow camera access in your browser settings.');
							if (onResult) onResult(null, error);
						} else if (error && error.name !== 'NotFoundException' && onResult) {
							setErrorMsg('Camera error: ' + error.message);
							onResult(null, error);
						}
					}
				);
			} catch (err) {
				if (err && err.name === 'NotAllowedError') {
					setPermissionDenied(true);
					setErrorMsg('Camera permission denied. Please allow camera access in your browser settings.');
				} else {
					setErrorMsg('Camera error: ' + (err?.message || 'Unknown error'));
				}
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
			{errorMsg && (
				<div style={{ color: '#ff5252', padding: 8, textAlign: 'center', fontSize: 14 }}>{errorMsg}</div>
			)}
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