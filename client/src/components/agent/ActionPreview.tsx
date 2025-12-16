/**
 * ActionPreview Component
 * Displays high-risk action preview with approval/rejection controls
 *
 * Features:
 * - Screenshot preview with highlighted action area
 * - Risk assessment display
 * - Countdown timer for auto-reject
 * - Approve/Reject buttons
 * - Rejection reason input
 *
 * Usage:
 * <ActionPreview
 *   approval={approvalRequest}
 *   onApprove={() => handleApprove(approvalId)}
 *   onReject={(reason) => handleReject(approvalId, reason)}
 * />
 */

import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Info,
} from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";

// ========================================
// TYPES
// ========================================

export interface ApprovalRequest {
  approvalId: number;
  executionId: number;
  actionType: string;
  actionDescription: string;
  actionParams?: Record<string, unknown>;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: string[];
  screenshotUrl?: string;
  expiresAt: Date;
}

interface ActionPreviewProps {
  approval: ApprovalRequest;
  onApprove: () => void;
  onReject: (reason: string) => void;
  loading?: boolean;
}

// ========================================
// COMPONENT
// ========================================

export function ActionPreview({
  approval,
  onApprove,
  onReject,
  loading = false,
}: ActionPreviewProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Calculate time remaining
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(approval.expiresAt);
      const remaining = Math.max(0, expires.getTime() - now.getTime());
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Auto-rejected
        console.log("Approval timed out");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [approval.expiresAt]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      return;
    }
    onReject(rejectionReason);
  };

  // Risk level styling
  const getRiskBadge = (level: string) => {
    const styles = {
      low: { variant: "default" as const, icon: Info, color: "text-blue-500" },
      medium: { variant: "secondary" as const, icon: AlertTriangle, color: "text-yellow-500" },
      high: { variant: "destructive" as const, icon: AlertTriangle, color: "text-orange-500" },
      critical: { variant: "destructive" as const, icon: Shield, color: "text-red-500" },
    };

    const style = styles[level as keyof typeof styles] || styles.low;
    const Icon = style.icon;

    return (
      <Badge variant={style.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${style.color}`} />
        {level.toUpperCase()} RISK
      </Badge>
    );
  };

  // Timeout warning
  const isUrgent = timeRemaining < 60000; // Less than 1 minute

  return (
    <Card className="border-2 border-orange-500 shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Action Requires Approval
            </CardTitle>
            <CardDescription className="mt-1">
              The agent wants to perform a high-risk action
            </CardDescription>
          </div>
          {getRiskBadge(approval.riskLevel)}
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-2 mt-3 p-2 rounded-md ${
          isUrgent ? "bg-red-50 border border-red-200" : "bg-gray-50 border border-gray-200"
        }`}>
          <Clock className={`h-4 w-4 ${isUrgent ? "text-red-500" : "text-gray-500"}`} />
          <span className={`text-sm font-medium ${
            isUrgent ? "text-red-700" : "text-gray-700"
          }`}>
            Time remaining: {formatTime(timeRemaining)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Action Description */}
        <div>
          <h3 className="font-semibold text-sm text-gray-700 mb-1">Action</h3>
          <p className="text-sm bg-gray-50 p-3 rounded-md border border-gray-200">
            {approval.actionDescription}
          </p>
        </div>

        {/* Action Type */}
        <div>
          <h3 className="font-semibold text-sm text-gray-700 mb-1">Type</h3>
          <Badge variant="outline" className="font-mono">
            {approval.actionType}
          </Badge>
        </div>

        {/* Risk Factors */}
        {approval.riskFactors.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-2">Risk Factors</h3>
            <ul className="space-y-1">
              {approval.riskFactors.map((factor, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span className="text-gray-700">{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Screenshot */}
        {approval.screenshotUrl && (
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-2">Screenshot</h3>
            <div className="border-2 border-gray-200 rounded-md overflow-hidden">
              <img
                src={approval.screenshotUrl}
                alt="Action preview"
                className="w-full h-auto"
              />
            </div>
          </div>
        )}

        {/* Action Parameters */}
        {approval.actionParams && Object.keys(approval.actionParams).length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-2">Parameters</h3>
            <pre className="text-xs bg-gray-50 p-3 rounded-md border border-gray-200 overflow-x-auto">
              {JSON.stringify(approval.actionParams, null, 2)}
            </pre>
          </div>
        )}

        {/* Warning Alert */}
        {(approval.riskLevel === "high" || approval.riskLevel === "critical") && (
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              This action is {approval.riskLevel} risk and may have significant consequences.
              Please review carefully before approving.
            </AlertDescription>
          </Alert>
        )}

        {/* Rejection Form */}
        {showRejectForm && (
          <div className="space-y-2 pt-2 border-t">
            <label className="text-sm font-medium text-gray-700">
              Rejection Reason (required)
            </label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why you're rejecting this action..."
              rows={3}
              className="resize-none"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {!showRejectForm ? (
            <>
              <Button
                onClick={onApprove}
                disabled={loading || timeRemaining === 0}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                disabled={loading || timeRemaining === 0}
                variant="destructive"
                className="flex-1"
                size="lg"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setShowRejectForm(false)}
                variant="outline"
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={loading || !rejectionReason.trim()}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Confirm Rejection
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ActionPreviewList Component
 * Displays a list of pending approvals
 */

interface ActionPreviewListProps {
  approvals: ApprovalRequest[];
  onApprove: (approvalId: number) => void;
  onReject: (approvalId: number, reason: string) => void;
  loading?: boolean;
}

export function ActionPreviewList({
  approvals,
  onApprove,
  onReject,
  loading,
}: ActionPreviewListProps) {
  if (approvals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No pending approvals</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {approvals.map((approval) => (
        <ActionPreview
          key={approval.approvalId}
          approval={approval}
          onApprove={() => onApprove(approval.approvalId)}
          onReject={(reason) => onReject(approval.approvalId, reason)}
          loading={loading}
        />
      ))}
    </div>
  );
}
