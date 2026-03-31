COLOR ?= $(shell cat COLOR)
IMAGE_NAMESPACE?=
ERROR_RATE ?= $(shell cat ERROR_RATE)
IMAGE_TAG?=latest

ifneq (${COLOR},)
IMAGE_TAG=${COLOR}
endif
ifneq (${LATENCY},)
IMAGE_TAG=slow-${COLOR}
endif
ifneq (${ERROR_RATE},)
IMAGE_TAG=bad-${COLOR}
endif

ifdef IMAGE_NAMESPACE
IMAGE_PREFIX=${IMAGE_NAMESPACE}/
endif

DOCKER_BUILD_OPTS ?= --platform linux/amd64,linux/arm64

ifeq ($(DOCKER_PUSH),true)
DOCKER_BUILD_OPTS += --push
endif

.PHONY: all
all: build

.PHONY: build
build:
	CGO_ENABLED=0 go build

.PHONY: image
image:
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		--build-arg COLOR=${COLOR} \
		--build-arg ERROR_RATE=${ERROR_RATE} \
		--build-arg LATENCY=${LATENCY} \
		${DOCKER_BUILD_OPTS} \
		-t $(IMAGE_PREFIX)otel-app:${IMAGE_TAG} .

.PHONY: run
run:
	go run main.go

.PHONY: lint
lint:
	golangci-lint run --fix

.PHONY: release
release:
	./release.sh DOCKER_PUSH=${DOCKER_PUSH} IMAGE_PREFIX=${IMAGE_PREFIX} IMAGE_NAMESPACE=${IMAGE_NAMESPACE}

.PHONY: clean
clean:
	rm -f otel-app
