FROM golang:1.26.0 AS build

WORKDIR /go/src/app
COPY go.mod go.sum ./
RUN go mod download && go install github.com/DataDog/orchestrion@v1.9.0
COPY --exclude=ui . .
RUN make

FROM scratch
COPY ui /ui
COPY --from=build /go/src/app/otel-app /otel-app
COPY COLOR /COLOR
COPY ERROR_RATE /ERROR_RATE
COPY LATENCY /LATENCY

ENTRYPOINT [ "/otel-app" ]
