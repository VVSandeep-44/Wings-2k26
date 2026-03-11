import { QrReader } from 'react-qr-reader';
import React from 'react';

const QRScanner = ({ onResult, constraints, style }) => {
	return (
		<div style={{
			width: '100%',
			maxWidth: 350,
			margin: '0 auto',
			borderRadius: 12,
			overflow: 'hidden',
			background: '#111',
			...style
		}}>
			<QrReader
				constraints={constraints || { facingMode: 'environment' }}
				onResult={(result, error) => {
					if (onResult) onResult(result, error);
				}}
				videoContainerStyle={{
					width: '100%',
					aspectRatio: '1/1',
					background: '#000',
				}}
				videoStyle={{
					width: '100%',
					height: 'auto',
					objectFit: 'cover',
				}}
				containerStyle={{
					width: '100%',
				}}
			/>
		</div>
	);
};

export default QRScanner;