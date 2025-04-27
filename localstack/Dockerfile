FROM localstack/localstack

# Install required packages
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf aws awscliv2.zip

# Copy initialization scripts
COPY *.sh /etc/localstack/init/ready.d/

# Make scripts executable
RUN chmod +x /etc/localstack/init/ready.d/*.sh 