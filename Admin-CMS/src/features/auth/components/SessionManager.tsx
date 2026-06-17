/**
 * Session manager component for viewing and managing active sessions
 */

import { useState } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Globe, 
  MapPin, 
  Clock, 
  Trash2, 
  AlertTriangle,
  Shield,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, StatusBadge, ConfirmDialog, Card } from '@/shared/components';
import { formatRelativeTime } from '@/shared/utils';
import type { Session } from '@/shared/types';
import { mockSessions } from '@/mock-data/auth';

interface SessionManagerProps {
  currentSessionId?: string;
  onSessionTerminated?: (sessionId: string) => void;
}

const getDeviceIcon = (device: string) => {
  const deviceLower = device.toLowerCase();
  if (deviceLower.includes('iphone') || deviceLower.includes('android') || deviceLower.includes('mobile')) {
    return Smartphone;
  }
  return Monitor;
};

const getBrowserColor = (device: string) => {
  const deviceLower = device.toLowerCase();
  if (deviceLower.includes('chrome')) return 'bg-yellow-100 text-yellow-800';
  if (deviceLower.includes('firefox')) return 'bg-orange-100 text-orange-800';
  if (deviceLower.includes('safari')) return 'bg-blue-100 text-blue-800';
  if (deviceLower.includes('edge')) return 'bg-emerald-100 text-emerald-800';
  return 'bg-gray-100 text-gray-800';
};

export function SessionManager({ 
  currentSessionId = 'session-1', 
  onSessionTerminated 
}: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>(mockSessions);
  const [isLoading, setIsLoading] = useState(false);
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);
  const [showTerminateAllDialog, setShowTerminateAllDialog] = useState(false);
  const [sessionToTerminate, setSessionToTerminate] = useState<Session | null>(null);

  // Mark currentSessionId as intentionally unused for future API integration
  void currentSessionId;

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Sessions refreshed');
    } catch (error) {
      toast.error('Failed to refresh sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateSession = async (session: Session) => {
    setTerminatingSession(session.id);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      toast.success('Session terminated');
      onSessionTerminated?.(session.id);
    } catch (error) {
      toast.error('Failed to terminate session');
    } finally {
      setTerminatingSession(null);
      setSessionToTerminate(null);
    }
  };

  const handleTerminateAllOtherSessions = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSessions((prev) => prev.filter((s) => s.current));
      toast.success('All other sessions terminated');
    } catch (error) {
      toast.error('Failed to terminate sessions');
    } finally {
      setIsLoading(false);
      setShowTerminateAllDialog(false);
    }
  };

  const currentSession = sessions.find((s) => s.current);
  const otherSessions = sessions.filter((s) => !s.current);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Active Sessions</h2>
          <p className="text-sm text-gray-600">
            Manage your active sessions across all devices
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {otherSessions.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowTerminateAllDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Terminate All Others
            </Button>
          )}
        </div>
      </div>

      {/* Current session */}
      {currentSession && (
        <Card className="border-primary-200 bg-primary-50/30">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                {(() => {
                  const DeviceIcon = getDeviceIcon(currentSession.device);
                  return <DeviceIcon className="h-6 w-6 text-primary-600" />;
                })()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {currentSession.device}
                  </span>
                  <StatusBadge status="active" label="Current Session" />
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {currentSession.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    {currentSession.ipAddress}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Last active {formatRelativeTime(currentSession.lastActive)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    Created {formatRelativeTime(currentSession.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Other sessions */}
      {otherSessions.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Other Sessions</h3>
          {otherSessions.map((session) => {
            const DeviceIcon = getDeviceIcon(session.device);
            const isTerminating = terminatingSession === session.id;

            return (
              <Card key={session.id} className="hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <DeviceIcon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {session.device}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getBrowserColor(session.device)}`}>
                          {session.device.split(' on ')[0]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {session.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          {session.ipAddress}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Last active {formatRelativeTime(session.lastActive)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSessionToTerminate(session)}
                    isLoading={isTerminating}
                    className="text-danger-600 hover:text-danger-700 hover:border-danger-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No other active sessions</p>
        </div>
      )}

      {/* Security notice */}
      <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-1">Security Notice</p>
          <p>
            If you see any sessions you don't recognize, terminate them immediately and consider 
            changing your password. Enable two-factor authentication for additional security.
          </p>
        </div>
      </div>

      {/* Terminate single session dialog */}
      <ConfirmDialog
        isOpen={!!sessionToTerminate}
        onCancel={() => setSessionToTerminate(null)}
        onConfirm={() => sessionToTerminate && handleTerminateSession(sessionToTerminate)}
        title="Terminate Session"
        message={`Are you sure you want to terminate the session from ${sessionToTerminate?.device}? This will sign out that device immediately.`}
        confirmText="Terminate"
        variant="danger"
        isLoading={!!terminatingSession}
      />

      {/* Terminate all sessions dialog */}
      <ConfirmDialog
        isOpen={showTerminateAllDialog}
        onCancel={() => setShowTerminateAllDialog(false)}
        onConfirm={handleTerminateAllOtherSessions}
        title="Terminate All Other Sessions"
        message={`Are you sure you want to terminate all ${otherSessions.length} other active sessions? This will sign out all other devices immediately.`}
        confirmText="Terminate All"
        variant="danger"
        isLoading={isLoading}
      />
    </div>
  );
}

export default SessionManager;
