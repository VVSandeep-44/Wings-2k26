

import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';


const QRScanner = ({ onResult, constraints, style }) => {
	const videoRef = useRef(null);
	const codeReaderRef = useRef(null);
	const [errorMsg, setErrorMsg] = useState('');
	const [permissionDenied, setPermissionDenied] = useState(false);
	const [initializing, setInitializing] = useState(true);
	const [hasTriedPrompt, setHasTriedPrompt] = useState(false);

	useEffect(() => {
		let isMounted = true;
		const codeReader = new BrowserMultiFormatReader();
		codeReaderRef.current = codeReader;

		const startScan = async () => {
			try {
				setInitializing(true);
				const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
				let deviceId = videoInputDevices[0]?.deviceId;
				for (const device of videoInputDevices) {
					if (device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('environment')) {
						deviceId = device.deviceId;
						break;
					}
				}
				if (!deviceId) {
					setErrorMsg('No camera device found.');
					setInitializing(false);
					return;
				}
				codeReader.decodeFromVideoDevice(
					deviceId,
					videoRef.current,
					(result, error, controls) => {
						if (!isMounted) return;
						setInitializing(false);
						if (result && onResult) {
							onResult({ text: result.getText() }, null);
							controls.stop();
						} else if (error && error.name === 'NotAllowedError') {
							setPermissionDenied(true);
							setErrorMsg('Camera permission denied. Please allow camera access in your browser settings and reload the page.');
							if (onResult) onResult(null, error);
						} else if (error && error.name === 'NotFoundException') {
							// No QR code found in frame, do not show error
						} else if (error && onResult) {
							setErrorMsg('Camera error: ' + error.message);
							onResult(null, error);
						}
					}
				);
				setHasTriedPrompt(true);
			} catch (err) {
				setInitializing(false);
				if (err && err.name === 'NotAllowedError') {
					setPermissionDenied(true);
					setErrorMsg('Camera permission denied. Please allow camera access in your browser settings and reload the page.');
				} else if (err && (err.name === 'NotFoundError' || err.name === 'OverconstrainedError')) {
					setErrorMsg('No suitable camera found on this device.');
				} else {
					setErrorMsg('Camera error: ' + (err?.message || 'Unknown error'));
				}
				if (onResult) onResult(null, err);
			}
		};

		// On iOS/Safari, camera permission prompt may not show unless triggered by user gesture
		if (!hasTriedPrompt && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
			// Try to prompt user to tap to start camera
			setErrorMsg('Tap to enable camera.');
			const tapHandler = () => {
				startScan();
				window.removeEventListener('touchend', tapHandler);
			};
			window.addEventListener('touchend', tapHandler);
		} else {
			startScan();
		}

		return () => {
			isMounted = false;
			if (codeReaderRef.current) {
				codeReaderRef.current.reset();
			}
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
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
			{initializing && (
				<div style={{ color: '#aaa', padding: 8, textAlign: 'center', fontSize: 14 }}>Initializing camera...</div>
			)}
			{errorMsg && (
				<div style={{ color: '#ff5252', padding: 8, textAlign: 'center', fontSize: 14 }}>{errorMsg}</div>
			)}
			{permissionDenied && (
				<div style={{ color: '#ffb300', padding: 8, textAlign: 'center', fontSize: 13 }}>
					<b>Tip:</b> Check browser settings and ensure camera permission is allowed. If using an in-app browser, open in Chrome or Safari.
				</div>
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