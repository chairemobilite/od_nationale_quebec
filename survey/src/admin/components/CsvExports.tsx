import React from 'react';
import { useTranslation } from 'react-i18next';

type ButtonColor = 'green' | 'blue' | 'red';

type LinkComponentProps = {
    title: string;
    fileName: string;
    buttonColor?: ButtonColor;
};

type ActionComponentProps = {
    title: string;
    actionUrl: string;
    buttonColor?: ButtonColor;
};

// Button component to download a CSV file.
const DownloadButtonComponent: React.FC<LinkComponentProps> = ({
    title,
    fileName,
    buttonColor = 'green'
}: LinkComponentProps) => {
    const handleDownload = () => {
        window.location.href = `/api/admin/data/${fileName}`;
    };

    return (
        <div>
            <button
                type="button"
                onClick={handleDownload}
                className={`button big ${buttonColor}`}
                aria-label={`${title}`} // For accessibility
            >
                {title}
            </button>
        </div>
    );
};

// Button component to perform an action (not download)
const ActionButtonComponent: React.FC<ActionComponentProps> = ({ title, actionUrl, buttonColor = 'blue' }) => {
    const { t } = useTranslation();
    const [message, setMessage] = React.useState<string | null>(null);

    const handleAction = async () => {
        setMessage(null);
        try {
            const response = await fetch(actionUrl, { method: 'POST' });
            const result = await response.json();
            if (response.ok) {
                // Translate the status code if it exists, otherwise use a generic success message
                const statusMessage = result.status
                    ? t(`surveyAdmin:${result.status}`)
                    : t('surveyAdmin:actionSuccess');
                setMessage('✔️ ' + statusMessage);
            } else {
                const errorMessage = result.error || t('surveyAdmin:actionError');
                setMessage('❌ ' + errorMessage);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setMessage(`❌ ${t('surveyAdmin:actionError')}: ${msg}`);
        }
    };

    return (
        <div>
            <button
                type="button"
                onClick={handleAction}
                className={`button big ${buttonColor}`}
                aria-label={`${title}`}
            >
                {title}
            </button>
            {message && <div>{message}</div>}
        </div>
    );
};

// Component to display links to download CSV exports.
const CsvExports: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="admin-widget-container">
            <ActionButtonComponent
                title={t('surveyAdmin:updateMonitoringCache')}
                actionUrl="/api/admin/data/updateMonitoringCache"
                buttonColor="blue"
            />
            <DownloadButtonComponent
                title={t('surveyAdmin:downloadTrackingData')}
                fileName="downloadTrackingDataCSV"
                buttonColor="green"
            />
        </div>
    );
};

export default CsvExports;
