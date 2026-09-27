resource "local_file" "deployment_manifest" {
  filename = "${path.module}/generated-deployment.txt"
  content  = "Application: ${var.application_name}\nEnvironment: ${var.environment}\n"
}
