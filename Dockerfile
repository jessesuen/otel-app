FROM golang:1.26.0 AS build

WORKDIR /go/src/app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN make

FROM scratch
COPY *.html ./
COPY *.png ./
COPY *.js ./
COPY *.ico ./
COPY *.css ./
COPY --from=build /go/src/app/otel-app /otel-app
COPY COLOR /COLOR
COPY ERROR_RATE /ERROR_RATE
COPY LATENCY /LATENCY

ENTRYPOINT [ "/otel-app" ]
