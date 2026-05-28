{{/*
Expand the name of the chart.
*/}}
{{- define "otel-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "otel-app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "otel-app.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Resolve app version: .Values.image.tag → .Chart.AppVersion → .Chart.Version
*/}}
{{- define "otel-app.appVersion" -}}
{{- .Values.image.tag | default .Chart.AppVersion | default .Chart.Version }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "otel-app.labels" -}}
{{ include "otel-app.selectorLabels" . }}
app.kubernetes.io/version: {{ include "otel-app.appVersion" . | quote }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "otel-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "otel-app.name" . }}
{{- end }}
