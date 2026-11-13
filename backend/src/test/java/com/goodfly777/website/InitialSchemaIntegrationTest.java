package com.goodfly777.website;

import static org.assertj.core.api.Assertions.assertThat;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import com.goodfly777.website.about.AboutContentService;

@SpringBootTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate"})
@ActiveProfiles("test")
class InitialSchemaIntegrationTest {
  @DynamicPropertySource
  static void freshSchema(DynamicPropertyRegistry properties) throws Exception {
    // H2 cannot parse PostgreSQL's timestamptz alias or partial indexes.
    // All table definitions and foreign keys still come from the production V1.
    String source;
    try (var stream = InitialSchemaIntegrationTest.class.getResourceAsStream("/db/migration/V1__init.sql")) {
      source = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
    }
    var adapted = source.replace("timestamptz", "timestamp with time zone")
      .replaceAll("(?s)create unique index resume_versions_one_active_idx\\s+on resume_versions \\(active\\)\\s+where active;", "");
    var directory = Path.of("target", "test-v1-migration", UUID.randomUUID().toString());
    Files.createDirectories(directory);
    Files.writeString(directory.resolve("V1__init.sql"), adapted);
    properties.add("spring.flyway.locations", () -> "filesystem:" + directory.toAbsolutePath().toString().replace('\\', '/'));
    properties.add("spring.datasource.url", () -> "jdbc:h2:mem:fresh_v1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
  }

  @Autowired JdbcTemplate jdbc;
  @Autowired Flyway flyway;
  @Autowired AboutContentService about;

  @Test void freshV1MatchesEntitiesAndContainsNoSampleContent() {
    assertThat(flyway.info().applied()).hasSize(1);
    assertThat(flyway.info().current().getVersion().toString()).isEqualTo("1");
    assertThat(flyway.migrate().migrationsExecuted).isZero();
    for (var table : new String[] {"blog_posts", "gallery_works", "gallery_photos", "comments", "media_assets", "resume_versions", "home_gallery_slots"}) {
      assertThat(jdbc.queryForObject("select count(*) from " + table, Integer.class)).isZero();
    }
    assertThat(jdbc.queryForObject("select count(*) from information_schema.tables where table_schema='public' and table_name='projects'", Integer.class)).isZero();
    var content = about.getAdmin();
    assertThat(content.profileDetails()).hasSize(5).allSatisfy(field -> assertThat(field.value()).isEmpty());
    assertThat(content.contactItems()).hasSize(2).allSatisfy(field -> assertThat(field.value()).isEmpty());
  }
}
