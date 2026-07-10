pipeline {
    agent any

    environment {
        DOCKER_USERNAME = 'rinserinse'
        DOCKER_HUB_REPO = "${DOCKER_USERNAME}/pipevisionaries"
        IMAGE_TAG = 'latest'
    }

    stages {
        stage('Login to Docker Hub') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'dockah', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        echo "Logging into Docker Hub..."
                        bat "docker logout"
                        bat "echo %DOCKER_PASS% | docker login -u %DOCKER_USER% -p %DOCKER_PASS%"
                    }
                }
            }
        }

        stage('Build React Docker Image') {
            steps {
                script {
                    bat "docker build -t ${DOCKER_HUB_REPO}:client-${IMAGE_TAG} ./client"
                }
            }
        }
        
        stage('Build Express Docker Image') {
            steps {
                script {
                    bat "docker build -t ${DOCKER_HUB_REPO}:server-${IMAGE_TAG} ./server"
                }
            }
        }

        stage('Push Docker Images to Docker Hub') {
            steps {
                script {
                    bat "docker push ${DOCKER_HUB_REPO}:client-${IMAGE_TAG}"
                    bat "docker push ${DOCKER_HUB_REPO}:server-${IMAGE_TAG}"
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
